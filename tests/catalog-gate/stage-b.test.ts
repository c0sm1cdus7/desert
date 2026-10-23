// Stage B of the negative suite: cases that need the slice-0 layout and the rules of slice 1.
// Each id is a test.todo until its rule lands; it then becomes a real case in stage-b.cases.ts.
import test from "node:test";
import { defineGateTests } from "./gate-tests.ts";
import { stageB } from "./stage-b.cases.ts";

defineGateTests(stageB);

const pending: readonly [string, string][] = [
  ["N01", "the lock password rebuilt from vendor input parts and a presentation prop: VENDOR_OUTSIDE_OWNER, then PRESENTATION_ESCAPE"],
  ["N04", "a non-whitespace text node in a composition: COMPOSITION_NATIVE_ELEMENT"],
  ["N06", "a foundation imports a vendor family it does not own: VENDOR_OUTSIDE_OWNER"],
  ["N12", "children passed to a catalog piece: PRESENTATION_ESCAPE"],
  ["N14", "a <style> block in a composition: CROSS_OWNER_CSS"],
  ["N19", "a stylesheet imported by a composition: CROSS_OWNER_CSS"],
  ["N20", "a utility class from a composition survives into emitted CSS: CROSS_OWNER_CSS (G2)"],
  ["N26", "an undeclared {@render} in a composition: SLOT_NOT_TYPED"],
  ["N27", "a {#snippet} that is not a declared slot: SLOT_NOT_TYPED"],
  ["N36", "style-src-attr 'unsafe-inline' in the CSP: UNQUALIFIED_ARTIFACT"],
  ["N37", "a byte of an approved foundation's stylesheet changes: FOUNDATION_UNAPPROVED_CHANGE"],
  ["N38", "an owned vendor file changes: FOUNDATION_UNAPPROVED_CHANGE"],
  ["N39", "a foundation contract changes: FOUNDATION_UNAPPROVED_CHANGE"],
  ["N40", "a proposed piece or specimen used by an approved composition: PIECE_NOT_APPROVED"],
  ["N41", "a hand-set ledger digest: FOUNDATION_UNAPPROVED_CHANGE"],
  ["N46", "a contract union value without a specimen: VARIANT_WITHOUT_SPECIMEN"],
  ["N48", "a Components constructor without a composition: GRAMMAR_NOT_IN_CATALOG"],
  ["N50", "a build manifest without gate evidence is served: UNQUALIFIED_ARTIFACT"],
  ["N52", "a DOM-touching helper moved into infra/: VISUAL_RUNTIME_GLOBAL"],
  ["N54", "the build path imports the test-only evidence project: VISUAL_RUNTIME_GLOBAL or dependency rule"],
];

for (const [id, description] of pending) test.todo(`${id} ${description}`);
