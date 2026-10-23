import { jsonSnapshot } from "../../json.ts";

export const samePublishedData = (left: unknown, right: unknown) => left === right ||
  JSON.stringify(jsonSnapshot(left)) === JSON.stringify(jsonSnapshot(right));
