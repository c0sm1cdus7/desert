import type { CatalogId } from "../catalog/types.d.ts";

/** The published shared-owner index and its coverage use one finite inventory: each owner's name and the piece it shows.
 * An owner keeps its name (its page and its destination) when its piece merges into a foundation, and then shows that
 * foundation; the speed dial and the confirmation dialog still show today's pieces until menu and dialog land. */
export const sharedOwnerPieces = {
  Place: "surface", ToolbarLayout: "bar",
  SpeedDial: "speed-dial", // lane-merge: menu
  FactRow: "fact-row", ReadingContent: "reading-content", Information: "information", InspectionCatalog: "inspection-catalog",
  ViewDestinationLink: "view-destination-link",
  ConfirmationDialog: "confirmation-dialog", // lane-merge: dialog
  AppearancePreferences: "appearance-preferences", AppearancePreview: "theme-preview", SeedAvatar: "avatar",
  AvatarShuffle: "avatar", Wallpaper: "wallpaper", AccessExperience: "access-experience", LockScreen: "lock-screen",
  ObjectStateControl: "object-state-control", ContextProperties: "context-properties", ObjectStateRow: "object-state-row",
  AttentionIndicator: "attention-indicator", AttentionList: "attention-list", AttentionStatus: "attention-status",
  LabelRail: "tag", ColorBullet: "tag", ReferenceValues: "tag",
  ReferenceSelector: "reference-selector", LabelsControl: "labels-control", MediaReferenceSelector: "media-reference-selector",
  Flow: "content-flow", RelatedSelection: "related-selection", SummaryWidget: "summary-widget",
} as const satisfies Readonly<Record<string, CatalogId>>;
export type SharedOwner = keyof typeof sharedOwnerPieces;
export const sharedCatalogOwners = Object.freeze(Object.keys(sharedOwnerPieces).filter((name): name is SharedOwner => Object.hasOwn(sharedOwnerPieces, name)));
