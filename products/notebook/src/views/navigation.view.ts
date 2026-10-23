import { Components, ViewTitles, defineView } from "desert-sdk/src/index.ts";

export const NavigationView = defineView({ name: "navigation", content: [Components.Header({ title: ViewTitles.product }), Components.Navigation()] });
