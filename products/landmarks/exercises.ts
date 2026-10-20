import { controlBankNode } from "../../src/interaction/bank-node.ts";
import { stackNode } from "../../src/interaction/place.ts";
import type { PublicCatalogExercises } from "../../src/public-catalog/exercises.ts";

const base = { version: "desert.control/1", disabled: false } as const;
const option = (value: string, label: string) => ({ value, label, disabled: false });

/** Product declares meanings and values; the shared bank owns every control and transient surface. */
export const travelKit: PublicCatalogExercises = {
  title: "Travel kit",
  subtitle: "Plan your next visit. Your draft stays in this tab.",
  stacks: [
    { id: "visit", title: "Your next visit", description: "Give your idea a name and choose where to go.", items: [
      stackNode({ version: "desert.bank-node/1", kind: "input.text", name: "trip-name", label: "Trip name", value: "", required: true, disabled: false }),
      controlBankNode({ ...base, kind: "select", id: "destination", label: "Destination", required: true, value: null,
        options: [option("1016", "Mount Fuji"), option("1017", "Wulingyuan"), option("1018", "Mount Everest")] }),
      controlBankNode({ ...base, kind: "date", id: "arrival", label: "Arrival date", required: false, value: null }),
    ] },
    { id: "notes", title: "Notes", items: [
      stackNode({ version: "desert.bank-node/1", kind: "input.multiline", name: "notes", label: "Things to remember", value: "", required: false, disabled: false }),
    ] },
    { id: "pace", title: "Travel pace", items: [
      controlBankNode({ ...base, kind: "options", id: "pace", label: "Travel pace", minSelected: 1, maxSelected: 1, selected: ["slow"],
        options: [option("slow", "Take it slowly"), option("active", "Keep exploring")] }),
    ] },
    { id: "interests", title: "Interests", items: [
      controlBankNode({ ...base, kind: "options", id: "activities", label: "Interests", minSelected: 0, maxSelected: 3, selected: [],
        options: [option("walking", "Walking"), option("photography", "Photography"), option("culture", "Culture")] }),
    ] },
    { id: "budget", title: "Budget", items: [
      controlBankNode({ ...base, kind: "money", id: "budget", label: "Estimated budget", required: false,
        currencies: [{ code: "USD", scale: 2 }, { code: "ARS", scale: 2 }, { code: "JPY", scale: 0 }], currency: "USD", minorUnits: null }),
    ] },
    { id: "essentials", title: "Travel documents", description: "Files stay on this device. Nothing is uploaded.", items: [
      controlBankNode({ ...base, kind: "files", id: "documents", label: "Travel documents", files: [],
        limits: { maxCount: 3, maxFileBytes: 5242880, maxTotalBytes: 10485760, accept: ["application/pdf", "image/*", "text/plain"] } }),
    ] },
    { id: "draft", title: "About this draft", items: [
      stackNode({ version: "desert.bank-node/1", kind: "fact", details: {
        kind: "facts", object: "draft", fields: ["storage"], labels: { "draft.storage": "Only in this tab" },
        facts: { storage: "Nothing is booked, uploaded or saved to an account. Closing or reloading this tab discards the draft and local file references." }, multiline: ["storage"],
      } }),
    ] },
    { id: "inspiration", title: "A little inspiration", description: "A sample destination to explore, separate from your travel draft.", items: [
      stackNode({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "featured", record: "1016",
        title: "Mount Fuji", eyebrow: "Featured Landmark", actionLabel: "Learn More",
        image: { asset: "thumb-1016", alt: "Mount Fuji framed by cherry blossoms" } }),
      stackNode({ version: "desert.bank-node/1", kind: "fact", details: { kind: "facts", object: "reference", fields: ["region", "source"],
        labels: { "reference.region": "Region", "reference.source": "Source" }, facts: { region: "Asia", source: "Apple Landmarks sample" } } }),
    ] },
  ],
};
