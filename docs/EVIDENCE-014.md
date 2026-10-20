# Visual bank fidelity — 2026-10-15

## Scope and authority

The owner approved preserving the Tres Marías visual language, aligning detail
labels with the Details title and restoring floating input labels. The subsequent
correction requires context Actions to be destination rows, not command buttons.
No product business rule, controller authority or commit mode changed.

Reference: Tres Marías PR 47, branch `kenon/framework-2026-10-14`, head
`81198c3c4a6351b3994b8731312612591315f1a0`. This remains a proposed upstream port,
not a released framework. Its row variant is already in the audited vendor set.

## Mechanism

- Shared TextInput floats its associated label on focus or nonempty value;
  requiredness and validation still come from the compiled input contract.
- Detail facts align with their title lane at desktop and mobile widths.
- ContextPanel composes DestinationRow using the existing shadcn row variant:
  title, trailing chevron, whole-row activation and native disabled behavior.
  The destination is the projected journey ID, not an inferred label or URL.
- Notebook Archive retains review and separate acceptance. Entering its destination
  is not acceptance. Button markup remains the accessible internal-navigation
  control; its visual treatment is a row, not a command CTA.
- Catalog and product consume the same ContextPanel. Footer Close remains a button.
- Shared text scaling reaches labels and controls. Wrapping header controls avoids
  horizontal overflow at 390px and 130% text.

## Evidence

`tests/web/visual-contract.test.ts` covers floating focus/value, required markers,
text scaling, draft preservation, narrow layout, Details alignment, full-width
Close and keyboard activation of the Archive destination. A controller read after
opening review independently confirms that the note is still active.

`tests/web/framework.test.ts` checks that both available/unavailable context
specimens use destination rows and retain their disabled semantics. The existing
Notebook browser journey confirms that only accepting review archives the note.

The v3 and final v4 builds each passed all 16 browser tests. The final v4 includes
zero-gap multi-row stacking and catalog assertions. Svelte diagnostics had zero
errors and warnings; typecheck and all 164 root tests passed after regenerating
the authoring snapshots. No failures, skips or pending cases were reported.

The initial attempt to run the new row assertion against an older build was rejected
by `BUILD_RENDERER_MISMATCH` after source changed. This is not a behavioral red-test
result. Earlier floating/alignment failures were observed before their corrections.

Screenshots: `artifacts/notebook-approved-bank/context-desktop.png` and
`artifacts/notebook-approved-bank/form-mobile.png`. Browser tests use isolated real
PostgreSQL stores. The interactive preview uses `.local/notebook-approved-bank`;
older preview stores are not reset, migrated or repinned.

## Limits

This is the installed finite bank, not the complete Tres Marías catalog. No native
haptics, VoiceOver certification, cross-browser guarantee, new journey graph or
general subject-action editor is claimed. Generic subject mutations with inputs
remain outside the current renderer vocabulary. No new skill bundle is published.
