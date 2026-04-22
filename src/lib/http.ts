import type { Photo } from "@/lib/photos";

export function photoSrc(photo: Pick<Photo, "volumeSlug" | "filename">): string {
  return `/api/photos/file/${encodeURIComponent(photo.volumeSlug)}/${encodeURIComponent(photo.filename)}`;
}
