// Historical fixtures preserve checks of retired APIs without shipping those APIs in the base.
import { type FrameLimits, fitMindFrame } from "../../../src/runtime/minds/mind-frame-fit.ts";
import type { FramePort, FrameSource } from "../../../src/runtime/minds/mind-frame.ts";
import { buildMindFrame } from "../../../src/runtime/minds/mind-frame.ts";
export function createFramePort(
  source: (scope: Parameters<FramePort>[0], turn: Parameters<FramePort>[1]) => FrameSource,
  limits: FrameLimits,
): FramePort {
  return (scope, turn) => {
    const result = fitMindFrame(buildMindFrame(scope, turn, source(scope, turn)), turn.language, limits);
    return result.tooLarge ? result : result.frame;
  };
}
