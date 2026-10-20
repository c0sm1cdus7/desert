import { clientDistribution, compile, humanSurface } from "../src/index.ts";
import { Notebook } from "../products/notebook/product.ts";
import { AgentNotebook, HumanNotebook } from "../products/notebook/surfaces.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { NotebookWeb } from "../products/notebook/distributions.ts";

const client = { id: "terminal", product: Notebook, renderer: "terminal-cli" as const, bindings: NotebookWeb.bindings };
clientDistribution({ ...client, surface: HumanNotebook });
// @ts-expect-error A human renderer cannot consume the agent protocol.
clientDistribution({ ...client, surface: AgentNotebook });
// @ts-expect-error Unsupported renderer.
clientDistribution({ ...client, surface: HumanNotebook, renderer: "imaginary" });
// @ts-expect-error An unregistered dependency cannot be bound.
clientDistribution({ ...client, surface: HumanNotebook, bindings: [{ dependency: "foreign", kind: "local", adapter: "store" }] });
// @ts-expect-error Unknown surface identity.
clientDistribution({ ...client, surface: { ...HumanNotebook, id: "unregistered" } });

const human = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], entry: ReadNote,
  primaryAction: CreateNote, subjectActions: [ArchiveNote], commit: HumanNotebook.commit,
  language: HumanNotebook.language, connection: HumanNotebook.connection };
humanSurface(human);
// @ts-expect-error A mutation cannot be the read entry.
humanSurface({ ...human, entry: CreateNote });
// @ts-expect-error A read is not a creation action.
humanSurface({ ...human, primaryAction: ReadNote });
// @ts-expect-error A read cannot mutate a subject.
humanSurface({ ...human, subjectActions: [ReadNote] });
// @ts-expect-error Every exposed journey needs its language entry.
humanSurface({ ...human, language: { ...human.language, journeys: { "create-note": "Create" } } });
// @ts-expect-error Every mutation needs an explicit commit mode.
humanSurface({ ...human, commit: { "create-note": "submit" } });
// @ts-expect-error Reads do not have commit modes.
humanSurface({ ...human, commit: { ...human.commit, "read-note": "submit" } });
// @ts-expect-error Automatic execution without human intent is not supported.
humanSurface({ ...human, commit: { ...human.commit, "create-note": "automatic" } });

const projection = compile(Notebook).surface("human");
// @ts-expect-error Compiled metadata is immutable, including in TypeScript.
projection.id = "changed";
// @ts-expect-error Nested compiled metadata is immutable too.
projection.journeys.push(projection.journeys[0]!);
