// Public, synthetic registration examples prove owner boundaries and lifecycle navigation without sockets.
import { meant } from "../../fields/phrases.ts";
import { deviceActionTexts as words } from "../../texts/devices.texts.ts";
import type { Case } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
const registration = {
  id: "example",
  name: meant(words.sample),
  publicKey: "MCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};
const registered = { act: "register-device", on: "identities/ana", input: registration };
const removed = { act: "remove", on: "identities/carla", input: {} };
type Example<X extends Program, I> = Case<X> & { input: I };
const change = <X extends Program>(
  operation: "accept" | "retire",
): readonly [Example<X, { device: string }>, ...Example<X, { device: string }>[]] => [
  {
    promise: words[operation === "accept" ? "accepted" : "retired"],
    given: [registered],
    on: "identities/ana",
    input: { device: "example" },
    then: {
      says: operation === "accept" ? words.accepted : words.retired,
      facts: [],
      ...(operation === "retire" ? { sure: words.sure } : {}),
    },
  },
  { promise: words.missing, on: "identities/ana", input: { device: "absent" }, then: { refused: words.missing } },
  {
    promise: words.forbidden,
    given: [registered],
    by: "beto",
    on: "identities/ana",
    input: { device: "example" },
    then: { refused: words.forbidden },
  },
];
const register = [
  {
    promise: words.registered,
    on: "identities/ana",
    input: registration,
    then: { says: words.registered, facts: [] },
  },
  {
    promise: words.duplicate,
    given: [registered],
    on: "identities/ana",
    input: registration,
    then: { refused: words.duplicate },
  },
  {
    promise: words.invalid,
    on: "identities/ana",
    input: { ...registration, publicKey: "invalid" },
    then: { refused: words.invalid },
  },
  { promise: words.owner, by: "beto", on: "identities/ana", input: registration, then: { refused: words.owner } },
  {
    promise: words.missing,
    given: [removed],
    on: "identities/carla",
    input: registration,
    then: { refused: words.missing },
  },
] as const;
export function deviceCases<X extends Program>() {
  return { register, accept: change<X>("accept"), retire: change<X>("retire") };
}
