// What a tool reads of its own is read at the instant of whoever looks: the tool has no clock.
import { afterEach, describe, expect, it } from "vitest";
import { anyToolScreen } from "./any-tool.ts";
import { shopRig } from "../../../../tests/support/shop-rig.ts";
import { salesTool } from "../../../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));

describe("a tool that reads data of its own", () => {
  it("is given the instant of whoever looks, with whatever else limits what it reads", () => {
    const rig = shopRig();
    rigs.push(rig);
    /** A tool that reads nothing but the instant it is read at. */
    const clock = {
      ...salesTool,
      view: (_state: unknown, _target: string, limits: { now?: number }) => JSON.stringify({ now: String(limits.now) }),
    };
    const words = { name: "Reloj", key: "r", itself: [{ title: "Reloj", empty: "", reads: { now: "Ahora" } }] };
    const house = rig.ports("ana", () => 5_000);
    const ports = {
      ...house,
      language: "es" as const,
      act: (value: Parameters<typeof house.act>[0]) => house.act(value, 0),
    };
    const screen = anyToolScreen(ports, clock, words, { acts: {} }, () => ({ title: "" }));
    expect(screen.view().map(stack => stack.rows.map(row => [row.title, row.detail]))).toEqual([[["Ahora", "5000"]]]);
  });
});
