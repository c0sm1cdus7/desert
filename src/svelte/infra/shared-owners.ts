import type { CatalogId } from "../catalog/types.d.ts";

/** The published shared-owner index and its coverage use one finite inventory: each owner's name and the piece it shows. */
export const sharedOwnerPieces = {
  Place: "place", ToolbarLayout: "toolbar-layout", SpeedDial: "speed-dial", FactRow: "fact-row",
  ReadingContent: "reading-content", Information: "information", InspectionCatalog: "inspection-catalog",
  ViewDestinationLink: "view-destination-link", ConfirmationDialog: "confirmation-dialog",
  AppearancePreferences: "appearance-preferences", AppearancePreview: "appearance-preview", SeedAvatar: "seed-avatar",
  AvatarShuffle: "avatar-shuffle", Wallpaper: "wallpaper", AccessExperience: "access-experience", LockScreen: "lock-screen",
  ObjectStateControl: "object-state-control", ContextProperties: "context-properties", ObjectStateRow: "object-state-row",
  AttentionIndicator: "attention-indicator", AttentionList: "attention-list", AttentionStatus: "attention-status",
  LabelRail: "label-rail", ColorBullet: "color-bullet", ReferenceValues: "reference-values",
  ReferenceSelector: "reference-selector", LabelsControl: "labels-control", MediaReferenceSelector: "media-reference-selector",
  Flow: "content-flow", RelatedSelection: "related-selection", SummaryWidget: "summary-widget",
} as const satisfies Readonly<Record<string, CatalogId>>;
export type SharedOwner = keyof typeof sharedOwnerPieces;
export const sharedCatalogOwners = Object.freeze(Object.keys(sharedOwnerPieces).filter((name): name is SharedOwner => Object.hasOwn(sharedOwnerPieces, name)));
