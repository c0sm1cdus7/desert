// An old kit request appended to a running house converts against the folders of its installed programs.
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { history, requestMindFixture } from "../../tests/support/request-mind-fixture.ts";

const fixtures: { cleanup(): void }[] = [];
afterEach(() => fixtures.splice(0).forEach(fixture => fixture.cleanup()));

it("appends an old assistant kit request for an act of an installable program", async () => {
  const fixture = requestMindFixture();
  fixtures.push(fixture);
  const house = await fixture.open();
  const old = effect("assistant-kit-set", { owner: "ana", kit: [{ tool: "talk", acts: ["thread/say"] }] }, "ana");
  const kit = { version: 2, selections: [{ kind: "action", program: "talk", tool: "thread", action: "say" }] };
  const written = house.journal.append(old, 500);
  expect(written.data).toEqual({ version: 2, owner: "ana", kit });
  expect(history(house).at(-1)).toEqual(written);
  expect(house.tools.state().through).toBe(written.seq);
});
