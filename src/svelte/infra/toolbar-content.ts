import type { Toolbar, ToolbarAction } from "../../interaction/toolbar.ts";
import type { ResolvedNode } from "../../interaction/resolved-node.ts";
import type { NodeEvent } from "../../interaction/node-events.ts";
import type { SurfaceIntent } from "../../interaction/intent.ts";
import type { ToolbarControls } from "./toolbar-controls.ts";
import type { MediaPlayback } from "./playback.svelte.ts";
import type { ViewerMedia } from "./media-source.ts";

export type ToolbarContent =
  | Readonly<{ kind: "commands"; toolbar: Toolbar; invoke: (intent: SurfaceIntent) => void;
      submit?: string; presentation?: "standard" | "message" | "transient"; controls?: ToolbarControls }>
  | Readonly<{ kind: "actions"; actions: readonly Extract<ResolvedNode,{kind:"action"}>["action"][]; onevent: (event: NodeEvent) => void }>
  | Readonly<{ kind: "place-navigation"; detail?: boolean; onback?: () => void;
      backAvailable?:boolean;
      topActions?: readonly ToolbarAction[]; actionGroup?: "create"; searchAvailable?: boolean; invoke?: (intent: SurfaceIntent) => void }>
  | Readonly<{ kind: "navigation-toggle"; searching: boolean; show?: boolean }>
  | Readonly<{ kind: "settings-placeholder" }>
  | Readonly<{ kind: "search"; title: string; query: string; searching: boolean; resultsId: string;
      onquery: (query: string) => void; onsearch: () => void; oncancel: () => void }>
  | Readonly<{ kind: "media-header"; close: () => void;
      zoom?: Readonly<{ scale: number; onzoom: (scale: number) => void; onreset: () => void }> }>
  | Readonly<{ kind: "media-controls"; items: readonly ViewerMedia[]; index: number;
      onindex: (index: number) => void; playback: MediaPlayback }>;
