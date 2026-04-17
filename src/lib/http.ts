export function photoSrc(filename: string): string {
  return `/photos/${encodeURIComponent(filename)}`;
}
