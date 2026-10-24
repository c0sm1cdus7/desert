import type { Frozen } from "../json.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { DeclaredView as WireView, ViewRef as WireViewRef } from "../views/schema.ts";
import type { Declared } from "../views/declared.ts";
import type { Message } from "../views/definition.ts";
import type { ViewJourney, ViewDestination, ViewNavigationEntry } from "../views/program-schema.ts";
import type { ModuleReference } from "./reference-types.ts";
import type { ActivityDefinition } from "../activities/authoring.ts";

export type AuthoredView = Omit<WireView, "leftDock" | "rightDock"> & {
  readonly leftDock?: AuthoredViewRef; readonly rightDock?: AuthoredViewRef;
};
export type ViewTarget = AuthoredView | ModuleReference<"view", string, string, AuthoredView>;
export type AuthoredViewRef = Omit<WireViewRef, "view"> & { readonly view: ViewTarget };
export type JourneyTarget = Frozen<JourneyDefinition> | AuthoredViewJourney | ModuleReference<"journey">;
type ReadExecution = Frozen<Extract<JourneyDefinition, { kind: "read" }>>;
export type ReadJourneyTarget = ReadExecution | Journey<Extract<ViewJourney, { kind: "read" }>>
  | ModuleReference<"journey", string, string, { readonly execution: ReadExecution }>;
type Output<O> = O extends { readonly view: string; readonly action: infer A }
  ? Omit<O, "view" | "action"> & { readonly view: ViewTarget; readonly action:
    A extends { readonly journey: string } ? Omit<A, "journey"> & { readonly journey: JourneyTarget } : A }
  : never;
type Journey<J> = J extends ViewJourney ? {
  readonly [K in keyof J]: K extends "view" | "detailView" ? ViewTarget
    : K extends "source" ? ReadJourneyTarget
    : K extends "initializeFrom" ? { readonly input: string; readonly source: ReadJourneyTarget }
    : K extends "related" ? readonly { readonly input: string; readonly read: ReadJourneyTarget;
        readonly membership?: { readonly update: ExposedJourney; readonly input: string };
        readonly layout?: { readonly object: string; readonly field: string };
        readonly where: { readonly field: { readonly object: string; readonly field: string }; readonly includes: "subject" } }[]
    : K extends "activity" ? ActivityDefinition
    : K extends "collections" ? readonly { readonly input: string; readonly read: ReadJourneyTarget; readonly limit: number;
        readonly summary?: { readonly field: {readonly object:string;readonly field:string};
          readonly segments: readonly {readonly value:string;readonly label:Message}[] };
        readonly preview?: { readonly read: ReadJourneyTarget; readonly where: { readonly object: string; readonly field: string };
          readonly media: { readonly object: string; readonly field: string }; readonly cover?: { readonly object: string; readonly field: string } };
        readonly where?: { readonly field: string; readonly value: string } }[]
    : K extends "outputs" ? readonly Output<J["outputs"][number]>[] : J[K];
} : never;
export type AuthoredViewJourney = Journey<ViewJourney>;
export type AuthoredViewOutputBinding = AuthoredViewJourney["outputs"][number];
export type AuthoredViewOutputAction = AuthoredViewOutputBinding["action"];
export type AuthoredViewDestination = Omit<Declared<ViewDestination>, "entryJourney"> & { readonly entryJourney: JourneyTarget };
export type DestinationTarget = AuthoredViewDestination | ModuleReference<"destination">;
export type AuthoredViewNavigationEntry = Omit<Declared<ViewNavigationEntry>, "destination"> & { readonly destination: DestinationTarget };
export type ExecutableJourneyReference = ModuleReference<"journey", string, string, { readonly execution: Frozen<JourneyDefinition> }>;
export type ExposedJourney = Frozen<JourneyDefinition> | ExecutableJourneyReference;
