import type { WebCatalogManifest } from '../catalog-manifest.ts';

/** The published shared-owner index and its coverage use one finite inventory. */
export const sharedCatalogOwners = [
  'Place', 'ToolbarLayout', 'SpeedDial', 'FactRow', 'ReadingContent', 'Information', 'InspectionCatalog', 'ViewDestinationLink', 'ConfirmationDialog',
  'AppearancePreferences', 'AppearancePreview', 'SeedAvatar', 'AvatarShuffle', 'Wallpaper', 'AccessExperience', 'LockScreen', 'ObjectStateControl',
  'ContextProperties', 'ObjectStateRow', 'AttentionIndicator', 'AttentionList', 'AttentionStatus', 'LabelRail', 'ColorBullet', 'ReferenceValues', 'ReferenceSelector',
  'LabelsControl', 'MediaReferenceSelector', 'Flow', 'RelatedSelection', 'SummaryWidget',
] as const satisfies readonly (keyof typeof WebCatalogManifest.owners)[];
export type SharedOwner = typeof sharedCatalogOwners[number];
