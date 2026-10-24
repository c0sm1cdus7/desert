# Repository protection (owner decision Q4)

The Visual Catalog gate is code. Branch protection keeps a pull request from weakening the gate that checks it, and keeps
anyone but the owner from stamping approvals. The owner applies these settings in GitHub. The executor only writes the
files they rely on: `.github/workflows/gate.yml` and `CODEOWNERS`, in DESERT and in VOID.

## Checks the workflows provide

| Check | What fails it |
| --- | --- |
| `gate` | Typecheck, `catalog.ts --check`, the full catalog gate, the unit suite or the negative suite. In VOID: `npm run check` or the web build. |
| `gate-from-base` | DESERT only. The base branch's gate rejects the PR tree, so a PR cannot loosen the rules that judge it. It is skipped, with a notice, while the base has no catalog gate. |
| `ledger-integrity` | DESERT only. A commit of the PR changes `src/svelte/catalog/approvals.json` without a signature that GitHub verifies for `c0sm1cdus7`. |

`gate-from-base` and `ledger-integrity` run on `pull_request_target`, so their definitions come from the base branch: a PR
cannot rewrite the checks that judge it. They use a read-only token and no secrets. `gate-from-base` also restores the base's
gate wiring (`src/authoring/**`, `scripts/catalog*.ts`, `src/build/svelte/project.ts`, `builder.ts`, the manifests) before it
runs. The rest of the PR tree still executes there with that read-only token; this is the residual risk of the design.

VOID's workflow checks out DESERT, which is private. It needs a repository secret `DESERT_READ_TOKEN`: a fine-grained
personal access token with read-only Contents access to `c0sm1cdus7/desert`. Until the owner creates it, VOID's `gate`
fails at the checkout step.

Under the strict build (Q1), `gate` stays red until slice 6 closes the violation list. Each PR reports the counts per code.

## Settings for the protected branch

Use one branch per repository:

- **DESERT:** `codex/module-architecture`.
- **VOID:** the branch the owner chooses. VOID has no `main` today; protect `codex/module-architecture`, or create `main` and protect that.

1. Settings, then Rules, then Rulesets: add a ruleset for the branch.
2. Require status checks to pass. In DESERT: `gate`, `gate-from-base` and `ledger-integrity`. In VOID: `gate`.
3. Block force pushes and block deletions.
4. Require a pull request before merging.

Then verify:

```bash
gh api repos/c0sm1cdus7/desert/rulesets
gh api repos/c0sm1cdus7/void/rulesets
```

## Review of code owners: choose one

GitHub does not let an author approve their own pull request. The owner is the only code owner. So "require review from
code owners" would block every PR the owner opens.

- **(a) A separate identity for the executor.** A bot account, or a GitHub App that the executor commits and pushes as.
  The owner then reviews as code owner, and "require review from code owners" can be on.
- **(b) No required review.** Rely on `ledger-integrity`, so only owner-signed commits change approvals, and on the
  required checks. The owner signs ledger commits with a key registered on the account (SSH or GPG signing).

Recommendation: (a). Under (b), required checks match by name only, and `gate` itself runs the PR's own workflow file, so
a PR could edit `gate.yml` to make `gate` pass trivially; only the two base-defined checks would still hold. With (a), the
owner's review of `.github/**` (CODEOWNERS) closes that path.

Record the choice here:

> Decision: _pending_
