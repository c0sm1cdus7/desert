// How the checks that a program's promises derive are named, and what they say when a case cannot even start.
export const promiseTexts = {
  outside: (variant: number) => `refuses what it does not ask for (${variant})`,
  notHeld: "is refused to who does not hold its tool",
  unseen: "is refused without its target in view",
  misplaced: "is refused anywhere but where it stands: on its tool, or on one of its things",
  covered: "promises a case for what it does and for each cause it refuses with",
  nothingDone: "no case promises what the act does",
  byKeys: (promise: string) => `${promise}, by keys`,
  notListed: (thing: string) => `no view of the tool leads to ${thing}`,
  notOffered: (act: string) => `the act ${act} is not offered where its case needs it`,
  noKey: (ask: string, answer: string) => `no key chooses ${answer} when asked ${ask}`,
  notSaid: (words: string) => `the screen does not say: ${words}`,
  givenRefused: (act: string, why: string) => `given ${act} was not accepted: ${why}`,
} as const;
