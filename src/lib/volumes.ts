import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Volume = {
  slug: string;
  displayName: string;
  volumeNumber: string;
  heroText: string;
  createdAt: string;
  sortOrder: number;
};

const DATA_DIR = join(process.cwd(), "data");
const PHOTOS_ROOT = join(process.cwd(), "public", "photos");
const VOLUMES_PATH = join(DATA_DIR, "volumes.json");

function normalizeVolume(input: Partial<Volume> & { slug: string }): Volume {
  return {
    slug: input.slug,
    displayName: input.displayName ?? input.slug.replace(/_/g, " "),
    volumeNumber: input.volumeNumber ?? "",
    heroText: input.heroText ?? "",
    createdAt: input.createdAt ?? new Date().toISOString(),
    sortOrder: input.sortOrder ?? 0,
  };
}

async function readVolumesFile(): Promise<Volume[]> {
  try {
    const raw = await readFile(VOLUMES_PATH, "utf8");
    const parsed = JSON.parse(raw) as Array<Partial<Volume> & { slug: string }>;
    return Array.isArray(parsed)
      ? parsed
          .filter((v) => typeof v?.slug === "string" && v.slug.length > 0)
          .map(normalizeVolume)
      : [];
  } catch {
    return [];
  }
}

async function writeVolumesFile(volumes: Volume[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(VOLUMES_PATH, JSON.stringify(volumes, null, 2));
}

export async function loadVolumes(): Promise<Volume[]> {
  let diskFolders: string[] = [];
  try {
    const entries = await readdir(PHOTOS_ROOT, { withFileTypes: true });
    diskFolders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => !n.startsWith("."));
  } catch {
    // photos root not yet created
  }

  const stored = await readVolumesFile();
  const storedBySlug = new Map(stored.map((v) => [v.slug, v]));
  const diskSet = new Set(diskFolders);

  let dirty = false;
  const volumes: Volume[] = [];

  for (const slug of diskFolders) {
    if (storedBySlug.has(slug)) {
      volumes.push(storedBySlug.get(slug)!);
    } else {
      volumes.push(normalizeVolume({ slug, sortOrder: 0, createdAt: new Date().toISOString() }));
      dirty = true;
    }
  }

  for (const v of stored) {
    if (!diskSet.has(v.slug)) dirty = true;
  }

  if (dirty) {
    volumes.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    await writeVolumesFile(volumes);
  }

  return [...volumes].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getVolume(slug: string): Promise<Volume | null> {
  const volumes = await loadVolumes();
  return volumes.find((v) => v.slug === slug) ?? null;
}

export async function createVolume(
  slug: string,
  metadata: Pick<Volume, "displayName" | "volumeNumber" | "heroText">,
): Promise<Volume> {
  await mkdir(join(PHOTOS_ROOT, slug), { recursive: true });

  const stored = await readVolumesFile();
  const newVolume = normalizeVolume({
    slug,
    displayName: metadata.displayName,
    volumeNumber: metadata.volumeNumber,
    heroText: metadata.heroText,
    createdAt: new Date().toISOString(),
    sortOrder: 0,
  });

  // New volume goes to top; bump all existing sort orders
  const updated = [newVolume, ...stored.map((v) => ({ ...v, sortOrder: v.sortOrder + 1 }))];
  await writeVolumesFile(updated);
  return newVolume;
}

export async function updateVolume(
  slug: string,
  patch: Partial<Omit<Volume, "slug" | "createdAt">>,
): Promise<Volume | null> {
  const stored = await readVolumesFile();
  const idx = stored.findIndex((v) => v.slug === slug);
  if (idx < 0) return null;
  stored[idx] = { ...stored[idx], ...patch, slug };
  await writeVolumesFile(stored);
  return stored[idx];
}

export async function moveVolume(slug: string, direction: "up" | "down"): Promise<boolean> {
  const stored = await readVolumesFile();
  const sorted = [...stored].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((v) => v.slug === slug);
  if (idx < 0) return false;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return false;

  [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
  const renumbered = sorted.map((v, i) => ({ ...v, sortOrder: i }));
  await writeVolumesFile(renumbered);
  return true;
}
