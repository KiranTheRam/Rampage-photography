import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  title: string;
  caption: string;
  addedAt: string;
};

export type Manifest = { photos: Photo[] };

const MANIFEST_PATH = join(process.cwd(), "data", "photos.json");

export async function loadManifest(): Promise<Manifest> {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    return JSON.parse(raw) as Manifest;
  } catch {
    return { photos: [] };
  }
}

export async function saveManifest(manifest: Manifest): Promise<void> {
  const sorted = {
    photos: [...manifest.photos].sort((a, b) =>
      b.addedAt > a.addedAt ? 1 : -1,
    ),
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(sorted, null, 2));
}

export function photoSrc(p: Pick<Photo, "filename">): string {
  return `/photos/${p.filename}`;
}
