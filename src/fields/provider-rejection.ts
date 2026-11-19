// Conserva la causa pública y acotada de un rechazo HTTP del proveedor.
export type ProviderRejection = Readonly<{ status: number; type: string; message: string }>;
