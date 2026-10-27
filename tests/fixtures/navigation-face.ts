// Owner decision V1 (2026-10-25, law 9e): a navigation destination's icon is the one Face, white ground and hairline,
// its colour on the glyph alone; the coloured group squares the frozen bases draw are withdrawn. Parity tests against
// those bases set the icon aside, and only it: both sides give the slot the compact face's box (the size the shell's
// stylesheet used to give the frozen square, which the Face now carries itself), so the row lays out alike, and neither
// paints anything in or behind it. tests/navigation-face.test.ts measures the face instead.

/** For a pixel comparison: both sides lay the destination icon's slot out as the compact face, and paint none of it. */
export const navigationFacesAside = "[data-navigation-icon]{width:1.5rem!important;height:1.5rem!important;background:none!important;box-shadow:none!important}"
  + "[data-navigation-icon] *{visibility:hidden!important}";
