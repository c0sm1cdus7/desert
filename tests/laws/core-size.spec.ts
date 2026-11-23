// Each production file names its purpose; folders group concerns rather than enforce a line budget.
import { readFileSync } from "node:fs";
import { basename, join, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { lawRepository } from "../support/law-repository.ts";
import { filesUnder, isSpec, src } from "../support/sources.ts";
import { tree } from "./tree.ts";
const files = filesUnder(src);
const production = files.filter(file => !isSpec(file));
const nameOf = (file: string): string => relative(src, file).split(sep).join("/");
const lines = (file: string): number => readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;
const withoutPurpose = (folder: string): string[] =>
  filesUnder(folder)
    .filter(file => !isSpec(file))
    .filter(file => !/^\/\/ \S[^\r\n]*$/u.test(readFileSync(file, "utf8").split(/\r?\n/u)[0] ?? ""))
    .map(file => relative(folder, file).split(sep).join("/"));
describe("the tree of src/", () => {
  it("admits exactly the planned production files, each with a one-line purpose", () => {
    expect(production.map(nameOf).sort()).toEqual(Object.keys(tree).sort());
    const vague = Object.entries(tree).filter(([, purpose]) => purpose.trim() === "" || purpose.includes("\n"));
    expect(vague.map(([name]) => name)).toEqual([]);
  });
  it("starts every production file with a one-line purpose comment", () => {
    expect(withoutPurpose(src)).toEqual([]);
  });
  it("catches missing, misplaced and empty headers in planted production files", () => {
    const repo = lawRepository({
      "src/blank.ts": "\n// Declares the entry point.\nexport {};\n",
      "src/block.ts": "/** Declares the entry point. */\nexport {};\n",
      "src/crlf.ts": "// Declares the entry point.\r\nexport {};\r\n",
      "src/empty.ts": "",
      "src/indented.ts": " // Declares the entry point.\nexport {};\n",
      "src/joined.ts": "//Declares the entry point.\nexport {};\n",
      "src/missing.spec.ts": "export {};\n",
      "src/nested/after-import.ts": 'import "../a.ts";\n// Declares the entry point.\nexport {};\n',
      "src/purpose.ts": "// Declares the entry point.\nexport {};\n",
      "src/spaces.ts": "// \t \nexport {};\n",
      "src/vacant.ts": "// \nexport {};\n",
    });
    expect(withoutPurpose(join(repo.root, "src")).sort()).toEqual([
      "a.ts",
      "blank.ts",
      "block.ts",
      "empty.ts",
      "indented.ts",
      "joined.ts",
      "nested/after-import.ts",
      "spaces.ts",
      "vacant.ts",
    ]);
  });
  it("groups at least two production files per folder, except the package root awaiting index.ts", () => {
    const folders = new Map<string, string[]>();
    for (const file of production) {
      const folder = posix.dirname(nameOf(file));
      folders.set(folder, [...(folders.get(folder) ?? []), nameOf(file)]);
    }
    const indexed = production.some(file => nameOf(file) === "index.ts");
    expect([...folders].filter(([folder, files]) => (folder !== "." || indexed) && files.length === 1)).toEqual([]);
  });
  // The signed move changes file size, but preserves the complete 519-line text budget.
  // 518 since the first step; 519 after union 1. Reorder: +14, addressing.ts (code that reads texts) lives in texts/.
  // Cleanup 1: +2 lines for texts/capital.ts, the shared initial-capital definition and its purpose.
  // Cleanup 5: +7 purpose headers in capital, identity-name, journal, secrets, socket, surface and tools.
  // Moving the existing headers in generic-surface and promises adds no lines; the per-file limit stays 300.
  // MCP: +21 lines for its four fixed tools, orientation and protocol errors in the catalog.
  // MCP with a real client: +1 line telling the agent that amounts travel in cents.
  // Cloud 1: +7 exact lines for cloud.texts.ts, three environment-key diagnostics and their purpose.
  // MCP budget: +1 line for the refusal of a wait past the per-identity bound.
  // Mind 1: +14 exact lines for the typed Identities skill message and its Spanish translation.
  // Models: +14 exact lines to explain catalog and provider errors.
  // Mind 3: +10 exact lines for the parameterized refusal message of mind contracts.
  // Mind 4A: +86 exact lines for assistant, adoption, delegation and authorship messages.
  // Frame: +26 exact lines for the frame's instructions and labels.
  // Mind 2C: +78 exact lines for closings, corrections, consultation and turn review.
  // Mind 2D: +29 exact lines for the purposes message of the six journey controls.
  // Mind 2E: +57 exact lines for diagnostics and the assignment of cards and spending.
  // Stage 2 union: +12 exact lines for the frame's house layer (how to read, answer and consult).
  // Distributions step 1: +17 exact lines for composition diagnostics and folder labels.
  // Reactions: +3 exact lines for an invalid declaration, a visible pending item and the effects migration.
  // Dist-kit: +9 exact lines for folders, inheritance, retired items and the explanation of administration.
  // Distributions step 2: +2 exact lines to reject dependencies on distributions and point at their path.
  // Contracts: +10 exact lines for value diagnostics, composition and executed cases.
  // MCP per program: +12 exact lines to explain folder and object targets and foreign actions turned off.
  // Dist-words: +14 exact lines to count levels and name the confirmation of folders and their holder.
  // Redelivery: +3 exact lines to say why the register of openings was not saved (or was cut).
  // Dist-v10: +2 exact lines to require the local test composition without tying the program to a distro.
  // Dist-program-minds: +22 exact lines for common rules, the program's words and an unavailability notice.
  // Program mind: +1 line to say that attention is marked by the code (decision 28).
  // Core Rules: +128 exact lines for actions, conditions, simulation and waits without a supervisor.
  // Devices add 16 lines to Rules' 128: the shared baseline is 993, so the combined budget is 1137.
  // Mind-error: +12 lines for the HTTP cause in the scene and stdout; +1 net for failures reading the body.
  // RT-VO3: +3 lines to explain the root of trust and +5 to check SQLite between reservation phases.
  // MCP MI-2: +2 lines to tell selection by program/target apart and the kit's restrictions in reason.
  // 20/11: +1 for the correction a mind gets when its wait ends before now.
  // 20/11 Assistants and supervisor: +74 exact lines. +14 for the assistant's own rules (who it is, whose, talking
  // only through the talk programs, journeys with its delegated kit, naming a mind to wake it, no invented
  // permissions); +60 for supervisor.texts.ts: its house layer (with the rules that ask for its judgment), its
  // rules, frame labels and review notices.
  // 21/11 Journeys by facts: +55 exact lines. +21 in journey.texts.ts (resume's purpose, a cut turn and why a journey
  // woke, in words); +32 in mind-turn.texts.ts (the stop list the closing fact reads, the conversation that outgrew the
  // request, the continuation correction and the results a journey hears between calls); +2 for the frame saying a
  // journey goes on.
  // 21/11 New supervisor: +50 exact (journey 17, supervisor 26, rules 6, mind-turn 1): stops, verdicts, its turns.
  // 21/11 review: +2 in rules.texts.ts, why a marked act got no verdict: its supervisor is starting, or a reaction.
  // 21/11 Device notices: +3 exact lines in devices.texts.ts (a house older than the device, a refused notice, one
  // that travels without its value). +1 exact line in devices.texts.ts: a tool's invalid notice, by tool and execution.
  // 21/11 step C: +23 in journey.texts.ts and mind-turn.texts.ts: a notice's wake line and two wait-on-notice refusals.
  // 21/11 review: +9 exact in journey.texts.ts: one line counting the cut journeys that do not fit beside a scene.
  // 21/11 plan refusals: +22 exact in journey.texts.ts: what a journey hears when it gets its own plan wrong.
  // 21/11 failed turns: +4 exact in supervisor.texts.ts: the wake line of a consciousness turn that failed.
  // 21/11 failed turns, the exception: +0 exact in supervisor.texts.ts: its sentence fits two lines that were there.
  // 21/11 stops that loop: +1 exact in supervisor.texts.ts: a stopped consciousness that fails having done nothing.
  // 22/11 whom a message wakes: +4 exact (program mind 2, assistant 1, supervisor 1): two wake, more must be named.
  // 22/11 «Con arroba» (with @): +1 exact in supervisor.texts.ts: «hilo individual», «en grupo» and how a
  // mind is named with @.
  // 22/11 surfaces, stage 1: +1 exact in surface.texts.ts: the seven key names move out of paint.ts, unchanged.
  // 22/11 surfaces, stage 2: +15 exact in screen-door.texts.ts: the entry's words and mask, a cut session's notice.
  // 22/11 English names: +16 in stored-names.texts.ts, what the migration says; +1 the kit's verb and +1 «ninguno»
  // move into identities and secrets texts; -1 the retired «herramienta» parameter's refusal leaves mcp.texts.ts.
  // 22/11 frames without noise: +25 exact in model.texts.ts: the limits a schema says in words (UNSIGNED).
  // 22/11 frames without noise: +21 exact in mind-frame.texts.ts: the label Menú and one line per act (UNSIGNED).
  // 22/11 frames without noise: +21 exact in journey.texts.ts: a waking fact said as itself (UNSIGNED).
  // 22/11 frames without noise: +15 exact in mind-frame.texts.ts: the read act and Actividad's older lines (UNSIGNED).
  // 22/11 frames without noise: +10 exact in mind-frame.texts.ts: what a capped object left out and how to read it,
  // and how many things stayed rows of their list (UNSIGNED).
  // 22/11 frames without noise: +4 exact in mind-frame.texts.ts: the house's reading guide for the stable-first order
  // and the words for an open journey in the cached menu (UNSIGNED).
  // 23/11 language: +286 exact for the English of every typed message (frame, supervisor, journeys, turns, schema
  // limits, assistants, program minds, the Identities skill) and the frame's lines on languages (UNSIGNED).
  // 23/11 language: +14 exact for an identity's language: its name in each language, the act and Preference that
  // say it, its creation, and the migration that gives Spanish to the identities of older journals (UNSIGNED).
  // 23/11 language: +668 exact: every display text of src/texts says itself in English beside its Spanish, and a
  // few English-only texts a person reads gain their Spanish (UNSIGNED).
  // 23/11 language: +3 exact: «Identity» as the title of an identity's stack, and the gate's two lines on a
  // program that declares a word in one language only (UNSIGNED).
  it("keeps every file within 300 lines and the texts within 2513", () => {
    expect(files.filter(file => lines(file) > 300).map(nameOf)).toEqual([]);
    const texts = production.filter(file => nameOf(file).startsWith("texts/"));
    expect(texts.reduce((total, file) => total + lines(file), 0)).toBeLessThanOrEqual(2513);
  });
  it("gives each production concern a unique filename, including text declarations", () => {
    const names = production.map(file => basename(file, ".ts"));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});
