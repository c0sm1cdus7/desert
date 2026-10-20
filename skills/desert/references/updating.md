# Adopt an exact DESERT skill revision

## What is versioned

SKILL.md metadata.version names the skill release. It is not the SDK package
version, a model version or an automatic update mechanism. The authoring manifest
records the exact bundle content digest and SDK version. Version labels alone
do not establish compatibility; use the tested source bundle accompanying the skill.

Any distributed change to instructions or bundled references requires a new skill
release and changelog entry, even if SKILL.md prose itself did not change. Working
changes are not a release until exported and verified. Do not overwrite a delivered
snapshot or silently reuse its version for a different published skill tree.

## Consumer update

1. Finish or checkpoint the current unit of work. Record the currently loaded skill
   version, source path, bundle digest and unresolved assumptions.
2. Obtain the new immutable bundle and verify it from its root with
   `node scripts/authoring-bundle.ts --verify`. Compare its digest with the one
   supplied through the trusted handoff. Hashes detect drift, not authorship.
3. Read every changelog entry since the installed version, the new SKILL.md, and
   each reference named by those entries. If the old version is unknown, perform
   the full entrypoint reading route.
4. Preserve the existing installed skill outside discovery directories. Replace
   the entire skill directory from the verified snapshot, not only SKILL.md and
   not a merge that leaves obsolete files. Preserve local customizations separately
   for review; do not overwrite them without authorization.
5. Reload/invoke the skill using the host's supported mechanism, then explicitly
   reread changed references. A changed file does not erase previously loaded
   instructions from conversation history. Confirm the actual loaded path/version
   and check for another installation shadowing it.
6. Acknowledge old → new version, exact bundle digest, changed rules, compatible
   SDK source and impact on in-flight work before continuing. If code migration is
   needed, plan it separately; installing instructions does not authorize it.

For Claude Code, project-local files live at `<project>/.claude/skills/desert`
and the invocation is `/desert`. Current Claude Code watches SKILL.md edits;
use `/reload-skills` if discovery needs refreshing. Supporting references still
need an explicit reread. If the installed host lacks that command or discovery
fails, start a fresh session or read the verified entrypoint by exact path and
report that fallback. See [official Claude Code documentation](https://code.claude.com/docs/en/skills#edit-a-skill-during-a-session).

Do not assume Claude web, Claude Code and Codex use the same installation commands.
Direct reading by verified path remains available without global installation.

## Maintainer release

- Bump metadata.version in SKILL.md; add a dated latest changelog entry describing
  changes, compatibility, migration/reread steps and exclusions.
- During draft development, use a new minor version for workflow/semantic changes
  and a patch for compatible corrections. Never treat 0.x as a stability promise.
- Regenerate source-derived references; run authoring checks, relevant tests and
  skill validation. Export to a new destination and verify the resulting manifest.
- Distribute the destination, version, digest and reread list. Do not update another
  agent's installation implicitly. Rollback restores the previous complete skill
  and its matching bundle; it does not roll back stores or migrate product code.
