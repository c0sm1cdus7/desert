declare module "virtual:desert/surface" {
  export const surface: import("@desert/web/types.ts").HumanSurface;
  export const validateInput: import("@desert/web/types.ts").ValidateInput;
  export const viewProgram: import("@desert/views/program-schema.ts").ViewProgram;
}
