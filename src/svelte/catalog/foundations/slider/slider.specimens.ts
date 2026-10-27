// One witness of Slider per state: a volume the person can set, and a playback position before the media is ready.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SliderSpecimens = [
  { state: "default", props: { label: "Volume", value: 0.6, min: 0, max: 1, step: 0.05, disabled: false } },
  { state: "disabled", props: { label: "Playback position", value: 0, min: 0, max: 1, step: 0.1, disabled: true } },
] as const satisfies readonly CatalogSpecimen<"slider">[];
