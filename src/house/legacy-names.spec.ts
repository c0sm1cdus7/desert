// The adversarial replay generator, with the digest measured from caa7245 before the mind namespace existed.
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { effect, type HouseEmission } from "../journal/events.ts";
import { emptyHouse, houseStep } from "./house.ts";

it("preserves 5000 legacy house histories without mind names", () => {
  let seed = 7;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed % n;
  };
  const pick = <T>(xs: readonly [T, ...T[]]): T => xs[rand(xs.length)] ?? xs[0];
  const people = ["ana", "beto", "carla", "dani"] as const;
  const tools = ["sales", "desk", "other"];
  const fact = (): HouseEmission => {
    const by = pick(people);
    switch (rand(6)) {
      case 0:
        return effect("house-created", {}, by);
      case 1:
        return effect("granted", { identity: pick(people), tools: tools.filter(() => rand(2)) }, pick(["ana", by]));
      case 2:
        return effect("removed", { identity: pick(people) }, pick(["ana", by]));
      case 3:
        return effect("handed", { to: pick(people) }, pick(["ana", by]));
      case 4:
        return effect("preferred", { hide: pick(["off"]), on: rand(2) === 1 }, by);
      default:
        return effect(
          "channel-created",
          { channel: "communicator/x", members: [...new Set([by, pick(people)])].sort() },
          by,
        );
    }
  };
  const digest = createHash("sha256");
  for (let run = 0; run < 5000; run++) {
    let house = emptyHouse;
    const facts = [effect("house-created", {}, "ana")];
    const history: HouseEmission[] = [...facts];
    for (let i = 0; i < 40; i++) history.push(fact());
    history.forEach((event, i) => {
      house = houseStep(house, { ...event, id: String(i), seq: i + 1, at: i });
    });
    digest.update(JSON.stringify([house.admin, [...house.grants], [...house.channels], [...house.hides]]) + "\n");
  }
  expect(digest.digest("hex")).toBe("5d73b4d027a2ba1c75a69a52aee1d14020df1fe1e8d3356dfb8212062bc4d15f");
});
