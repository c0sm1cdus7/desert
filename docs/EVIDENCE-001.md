# Compiler and portable shape slice

Date: 2026-10-14. This is a recorded local execution summary, not a signed build
attestation or complete raw transcript. Source-control snapshots were not created.

## First compiler test run

An initial run encountered Node 20 under npm despite Node 24 being available.
That failure was environmental and is **not** recorded as behavioral RED.

Running with Node 24.16.0 against a compiler stub that threw
`Product compilation is not implemented` produced 8 tests: 6 failed and 2 passed.
The failures covered valid compilation, a contract-only behavioral change, strict
validation, empty versus absent values, snapshot isolation and stable property
ordering. The two initial generic negative checks were not meaningful proof: a
stub rejecting everything satisfied them. Their reason checks were subsequently
strengthened. The generated safe-integer upper bound was made explicit in the
expected schema; the first expectation had not specified that representation.
Do not claim unchanged-test RED/GREEN evidence for those revised assertions.

After implementation: typecheck passed and all 8 compiler tests passed.

## Portable projection test run

Before the projection/shared-client implementation: 4 tests, 3 failed, 1 passed.
Failures were the missing `describe()` projection and the explicit unimplemented
portable-validator stub. Accessor/inherited-value rejection already worked and
was retained as a green characterization test, not artificially broken.

After implementation and an additional browser bundle boundary check:

- `npm run check`: TypeScript passes, 13 tests pass, no skips.
- `npm run inspect`: runs the Notebook definition; valid input passes, missing
  `body` returns a structured `required` issue.
- `quick_validate.py skills/desert`: passes structural skill validation.
- All current authored TypeScript files are below 100 lines.

The browser check uses esbuild's browser platform with in-memory output. It proves
the entry can be bundled without unresolved Node built-ins, not that a browser,
Capacitor host, Swift consumer or Kotlin consumer has executed it.

## Checked test-file identities

```text
2afb0432ed46069c8163cc11a0fdf493966200d110bd93e49521bcf40faf6d1a tests/compile.test.ts
dd6836ba80b39a02bb370aa7e2f9e592bebee8e1cdb1bc913c682ec69439e474 tests/projection.test.ts
3c9027ca653b6a34ad7807f613b266f3b3630510997165df8187e265bbeb0094 tests/browser-boundary.test.ts
```

These hashes identify the tests in the green run only. They do not certify the
SDK or reconstruct missing historical revisions. The dependency lock is local;
no package, deployment, repository or native application was published.
