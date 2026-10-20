import { controlNode, type ControlNode } from "./control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { controlInspection } from "./catalog-ownership.ts";

const sample = (state: string, node: ControlNode, releaseAfterMs?: number) => ({
  state, node: controlNode(node), ...(releaseAfterMs === undefined ? {} : { releaseAfterMs }),
});
const base = { version: "desert.control/1", disabled: false } as const;
const choices = [
  { value: "first", label: "First option", disabled: false },
  { value: "second", label: "Second option", disabled: false },
  { value: "unavailable", label: "Unavailable option", disabled: true },
];
const information = [
  { kind: "text", text: "Contextual information stays connected to its trigger. Close to return to your work." },
  { kind: "fact", label: "Product execution", value: "Not installed" },
] as const;
const options = { ...base, kind: "options", minSelected: 1, selected: [], options: choices } as const;
const money = { ...base, kind: 'money', label: 'Amount', required: true, locale: 'es-AR',
  currencies: [{ code: 'ARS', scale: 2, face: { kind: 'flag', region: 'AR' } },
    { code: 'USD', scale: 2, face: { kind: 'flag', region: 'US' } }], currency: 'ARS', minorUnits: null } as const;
const image = { ...base, kind: "image", label: "Notebook cover", alt: "An open notebook with blue pages", aspect: "landscape" } as const;
const lockReleaseMs = 3000;

export const ControlBank = freezeDeep(([
  { id: "control.select", family: "control", specimens: [
    sample("available", { ...base, kind: "select", id: "choice", label: "Single choice", required: false, value: null, options: choices }),
    sample("disabled", { ...base, kind: "select", id: "disabled-choice", label: "Disabled choice", disabled: true,
      required: false, value: "retained", options: [{ value: "retained", label: "Retained selection", disabled: false }] }),
  ] },
  { id: "control.popover", family: "control", specimens: [
    sample("available", { ...base, kind: "popover", id: "help", label: "Open contextual information", open: false,
      title: "Local interaction", content: information }),
    sample("locked", { ...base, kind: "popover", id: "locked-help", label: "Open locked information", open: false,
      locked: true, title: "Locked information", content: [{ kind: "text",
        text: `This isolated lock demonstration releases after ${lockReleaseMs / 1000} seconds. No product operation is running.` }] }, lockReleaseMs),
  ] },
  { id: "control.files", family: "control", specimens: [
    sample("empty", { ...base, kind: "files", id: "local-files", label: "Choose local text files",
      limits: { maxCount: 2, maxFileBytes: 10240, maxTotalBytes: 15360, accept: ["text/plain"] }, files: [] }),
  ] },
  { id: "control.options", family: "control", specimens: [
    sample("one", { ...options, id: "one-choice", label: "Choose one option", maxSelected: 1 }),
    sample("many", { ...options, id: "many-choices", label: "Choose up to two options", maxSelected: 2 }),
    sample("disabled", { ...options, id: "disabled-options", label: "Retained choice", maxSelected: 1,
      disabled: true, selected: ['first'] }),
    sample("constrained", { ...options, id: "constrained-options", label: "Keep one or two options", maxSelected: 2,
      selected: ['first', 'second'], options: [...choices, { value: 'third', label: 'Third option', disabled: false }] }),
  ] },
  { id: "control.money", family: "control", specimens: [
    sample("empty", { ...money, id: 'amount' }),
    sample("value", { ...money, id: 'amount-value', minorUnits: '12550' }),
    sample("disabled", { ...money, id: 'amount-disabled', disabled: true, minorUnits: '12550' }),
    sample("constrained", { ...money, id: 'amount-whole-yen', label: 'Whole yen', locale: 'en-US',
      currencies: [{ code: 'JPY', scale: 0 }], currency: 'JPY', minorUnits: '2500' }),
  ] },
  { id: "control.date", family: "control", specimens: [
    sample("calendar", { ...base, kind: "date", id: "date", label: "Date", required: true, value: "2026-10-15",
      minimum: "2026-10-01", maximum: "2026-12-31" }),
  ] },
  { id: "control.tag", family: "control", specimens: [
    ...(["neutral", "accent", "success", "warning", "destructive"] as const).map(tone =>
      sample(tone, { ...base, kind: "tag", id: `tag-${tone}`, label: tone === "success" ? "Ready" : tone === "destructive" ? "Failed" : tone === "warning" ? "Attention" : tone === "accent" ? "In progress" : "Draft", tone })),
  ] },
  { id: "control.image", family: "control", specimens: [
    sample("available", { ...image, id: "cover", source: "/bank-image.svg" }),
    sample("unavailable", { ...image, id: "missing-cover", source: null }),
  ] },
  { id: "control.avatar", family: "control", specimens: [
    sample("image", { ...base, kind: "avatar", id: "author-photo", label: "Alex Rivera", source: "/bank-image.svg", fallback: "AR" }),
    sample("fallback", { ...base, kind: "avatar", id: "author-initials", label: "Sam Lee", source: null, fallback: "SL" }),
  ] },
] as const).map(entry => ({ ...entry, inspection: controlInspection(entry.id.slice(8), entry.specimens.map(specimen => specimen.state)) })));
