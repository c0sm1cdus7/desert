# Contract compiler and Notebook — 2026-10-14

## Scope

Implemented the first finite authoring/compiler vocabulary for Notebook. Contracts
are real local TypeScript modules and checked runtime descriptors, not the hypothetical
`@desert/*` package imports in the preceding design document. No normative guide or
older SDK was modified. Skill support notes were reconciled, not globally installed.

This increment checks meaning and generates projections. It does not execute the
policies or commands. There is no renderer, database, authentication service or HTTP
entry. Distribution plans are not binaries, and descriptor validity is not deployment
or privacy evidence. The broader proposal remains incomplete.

## Commands run

Using Node 24.16.0 from the pinned local runtime:

```sh
npm run check
npm run inspect
```

Result: TypeScript passes, 49 runtime/compiler tests pass, zero skips. The type test
includes 27 expected source-line failures and positive controls. It removes the
suppression directives in memory and checks actual compiler diagnostics, without
editing test files. Normal typecheck also fails if an expected error disappears.

Inspection emits strict create input, shared human projection and four unbuilt
distribution plans. Notebook contract digest:
`a628ff2034de2b50f8a863c1888155520fe53c60e40bab56e004a7c7c6ec2cd8`.
This is content identity, not a signed release or authorization credential.

## Red/green evidence and qualifications

- Six contract tests were added first: all six failed. The old grammar rejected
  Notebook, while negatives expected specific semantic errors, not generic throws.
  They now pass with actual grammar/reference/assignment checks.
- Three input/surface projection tests were added before those APIs: all three
  failed on missing methods. They now validate input and shared generated schemas.
  One test title was later clarified to avoid implying a running controller.
- Distribution tests initially produced three failures and one false positive:
  a generic `throws` passed because the API did not exist. Its assertion was
  strengthened before implementation; all four then failed. The corrected tests
  now pass. Do not count the earlier false positive as meaningful evidence.
- Two immutable metadata type cases initially failed typecheck because their error
  directives were unused. Deep readonly return types fixed the static gap; runtime
  freezing already existed. A recursive JSON typing issue was fixed in the validator.
- The other negative static and adversarial runtime cases are characterization and
  strengthening checks, not claimed retroactive test-first history.
- Original shape behavior is retained in the legacy shape fixture. Notebook itself
  now adds owner/state; baseline shape expectations were not silently weakened.

Raw full red logs were not saved as independent files. The tool transcript contains
the runs; this document records outcomes and limitations, not reconstructed logs.

## Demonstrated boundaries

- Literal enum preservation and object-specific field references in TypeScript.
- Derived input types and schemas; no owner input, coercion or extra-field removal.
- Complete create effects, declared-input references and compatible assignments.
- Owner supplied by the actor expression; ownership changes rejected by this
  vocabulary. This is contract validation, not authenticated runtime enforcement.
- Conditions/literals checked against target schemas, including ranges and enums.
- Missing/duplicate/conflicting definitions, unknown vocabulary and inherited field
  names rejected rather than guessed.
- Human navigation and language references checked; terminal/web/iOS bind the exact
  same human projection. Agent surface cannot be passed to a human renderer.
- Projection omits private policy/effect bodies, is frozen, and retains connection
  requirements without claiming those requirements are implemented.
- A source mutation cannot change an existing compiled artifact.
- Client validation entry still bundles without Node, compiler or authoring modules.

## Limits and next acceptance work

TypeScript can be bypassed by casts, JavaScript and untrusted JSON. Runtime checking
therefore remains mandatory. Numeric/string range refinements are runtime checks;
not every domain constraint is expressible as a useful TypeScript type.

Finite tests do not prove the SDK impossible to break. They provide reproducible
counterexamples and regression gates. The supported vocabulary is deliberately
finite; wider policies, profiles, state machines, locale semantics, releases and
cross-language bindings still require design and implementation.

Next: demonstrate an admitted mutation under trusted identity with current policy,
revision/expiry checks, atomic PostgreSQL effect/receipt, concurrency and retry
reconciliation. Then implement actual surface realizations and prove behavior in
browser, terminal and devices. Do not add an ungoverned `execute` convenience path.
