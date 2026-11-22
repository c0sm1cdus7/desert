// Proves, through a running house, that a program's acts wake its mind only when the program does not talk.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { requestMindFixture, answer, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
/** The notes program as it is, or declared as a program that talks, as the Communicator is. */
const fixture = (talks: boolean) => {
  const f = requestMindFixture(undefined, undefined, registry =>
    registry.map(tool => (talks && tool.id === "notes" ? { ...tool, talks: true } : tool)),
  );
  fixtures.push(f);
  return f;
};
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  vi.unstubAllGlobals();
});
const add = (house: RequestHouse, body: string) => {
  house.bus.emit(effect("attended", { target: "notes/personal" }, "ana"));
  return house.tools.act(
    { act: "personal/add", target: "notes/personal", input: { body } },
    house.tools.state().through,
    "ana",
  );
};
it.each([
  [false, 1],
  [true, 0],
] as const)(
  "22/11: a person's act on the program's own object, talks %s, wakes its mind %i times",
  async (talks, n) => {
    const f = fixture(talks);
    const house = await f.open();
    f.prepare(house);
    f.respond(() => answer());
    const calls = f.transport.mock.calls.length;
    expect(add(house, "Mate el jueves").status).toBe("accepted");
    await (await house.minds)?.flush();
    expect(f.transport).toHaveBeenCalledTimes(calls + n);
  },
);
it("22/11: the mind of a program that talks still wakes for a message to it in a thread of two", async () => {
  const f = fixture(true);
  const house = await f.open();
  f.prepare(house);
  f.respond(() => answer());
  const calls = f.transport.mock.calls.length;
  expect(send(house, "mind:notes", "Hola").status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(f.transport).toHaveBeenCalledTimes(calls + 1);
});
