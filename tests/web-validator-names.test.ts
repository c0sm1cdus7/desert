import test from "node:test";
import assert from "node:assert/strict";
import { compile, composeProduct, humanExposure, agentExposure } from "../src/index.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./fixtures/notebook-domain.ts";
import { fixtureText } from "./fixtures/messages.ts";

test("a product with many commands emits distinct browser validators and retains canonical admission", async () => {
  const source = authoredNotebookSource();
  const actions = Array.from({ length: 24 }, (_, index) => ({ ...ArchiveNote,
    id: `archive-version-${index}`, command: { ...ArchiveNote.command, id: `validate${index}` },
  }));
  const journeys = [CreateNote, ReadNote, ArchiveNote, ...actions];
  const application = compile(composeProduct({ ...source,
    journeys: [...source.journeys, ...actions.map(execution => ({ execution,
      label: fixtureText.archiveNote, humanReview: "not-required" as const }))],
    exposures: [humanExposure({ id: "human", journeys, locale: "en" }), agentExposure("agent", journeys)],
  }));
  const code = await buildHumanModule(application, "human");
  assert.doesNotMatch(code, /new Function|node:crypto/);
  const browser = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const commands = application.surface("human").journeys.filter(journey => journey.kind === "mutation");
  assert.equal(commands.length, 26);
  for (const command of commands) {
    const inputs = command.inputFields.length ? [{ title: fixtureText.idea, body: "Text" }, {}, { title: 1, body: "Text" },
      { title: fixtureText.idea, body: "Text", extra: true }] : [{}, { extra: true }, { title: fixtureText.unpublishedInput }, []];
    for (const input of inputs) {
      assert.deepEqual(browser.validateInput.inspect(command.commandId, input), application.validateInput(command.commandId, input), command.commandId);
    }
  }
  assert.throws(() => browser.validateInput("not-published", {}), /Unknown command/);
});
