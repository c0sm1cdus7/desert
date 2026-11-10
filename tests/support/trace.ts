/** Words that tell a model how to behave: no string of the code and no purpose may carry one. */
const normativeWords = [
  /\bdeb[eé]s\b/i,
  /\bten[eé]s que\b/i,
  /\btienes que\b/i,
  /\bnunca\b/i,
  /\bsiempre\b/i,
  /\bno hagas\b/i,
  /\b(?:sos|eres) un/i,
  /\byou are\b/i,
  /\byou must\b/i,
  /\bmust\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\bshould\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
];

export const isNormative = (text: string): boolean => normativeWords.some(word => word.test(text));
