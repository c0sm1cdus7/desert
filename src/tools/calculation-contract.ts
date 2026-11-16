/** The public shape of a version calculated from code; construction belongs to runtime. */
interface CodeProjectionDeclaration {
  readonly kind: "code";
  readonly trees: readonly string[];
  readonly extensions: readonly string[];
  readonly value: string;
}
export type CalculationVersion = string | CodeProjectionDeclaration;
