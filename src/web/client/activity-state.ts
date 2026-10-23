import type { ApiMethods, Prepared } from "../types.ts";
import type { ViewJourney } from "../../views/program-schema.ts";

export type ActivityExperience = Extract<ViewJourney, { kind: "activity" }>;
export type ActivitySnapshot = ApiMethods["activityRead"]["output"];
export type ActivityState = {
  experience: ActivityExperience | null; activity: ActivitySnapshot | null;
  draft: Readonly<Record<string, string | number>>; prepared: Prepared | null;
  touched: readonly string[];
  busy: boolean; pending: "invoke" | "accept" | "recover" | null;
  error: string | null; uncertain: boolean; receiptMissing: boolean;
};
export const emptyActivityState = (): ActivityState => ({ experience: null, activity: null, draft: {}, prepared: null, touched: [],
  busy: false, pending: null, error: null, uncertain: false, receiptMissing: false });

