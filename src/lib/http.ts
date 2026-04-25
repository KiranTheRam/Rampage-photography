import type { Photo } from "@/lib/photos";

export function photoSrc(photo: Pick<Photo, "volumeSlug" | "filename">): string {
  return `/photos/${encodeURIComponent(photo.volumeSlug)}/${encodeURIComponent(photo.filename)}`;
}

export function optimizedPhotoSrc(
  photo: Pick<Photo, "volumeSlug" | "filename">,
  width: number,
  quality = 75,
): string {
  const params = new URLSearchParams({
    url: photoSrc(photo),
    w: String(width),
    q: String(quality),
  });

  return `/_next/image?${params.toString()}`;
}
