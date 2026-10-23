/** Binary limits remain exact; presentation uses readable IEC units. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const exponent = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(bytes / 1024 ** exponent)} ${['B','KiB','MiB','GiB'][exponent]}`;
}
