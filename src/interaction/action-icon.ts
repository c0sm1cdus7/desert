import { Type, type Static } from '@sinclair/typebox';

/** Finite shared action glyphs. A label or destination ID never selects an icon. */
export const ActionIconSchema = Type.Union([
  Type.Literal('back'), Type.Literal('close'), Type.Literal('save'), Type.Literal('review'),
  Type.Literal('recover'), Type.Literal('retry'), Type.Literal('create'), Type.Literal('archive'),
  Type.Literal('catalog'), Type.Literal('open'), Type.Literal('confirm'), Type.Literal('search'), Type.Literal('more'),
  Type.Literal('navigation'), Type.Literal('media'), Type.Literal('edit'), Type.Literal('settings'),
  Type.Literal('lock'), Type.Literal('restore'), Type.Literal('palette'),
  // Media transport and paging (slice 3: the media player and viewer draw their controls as Actions).
  Type.Literal('play'), Type.Literal('pause'), Type.Literal('volume'), Type.Literal('muted'), Type.Literal('previous'), Type.Literal('next'),
]);
export type ActionIcon = Static<typeof ActionIconSchema>;
