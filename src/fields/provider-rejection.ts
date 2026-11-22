// Keeps the public, bounded cause of a provider's HTTP rejection.
export type ProviderRejection = Readonly<{ status: number; type: string; message: string }>;
