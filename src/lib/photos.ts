import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  title: string;
  caption: string;
  addedAt: string;
};

type PhotoMetadata = Omit<Photo, "id">;
type MetadataStore = { photos: PhotoMetadata[] };

const DATA_DIR = join(process.cwd(), "data");
const PHOTOS_DIR = join(process.cwd(), "public", "photos");
const METADATA_PATH = join(DATA_DIR, "photos.json");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic"]);

function sortPhotos<T extends { addedAt: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (b.addedAt > a.addedAt ? 1 : -1));
}

function normalizeMetadata(input: Partial<PhotoMetadata> & { filename: string }): PhotoMetadata {
  return {
    filename: input.filename,
    width: input.width ?? 0,
    height: input.height ?? 0,
    title: input.title ?? "",
    caption: input.caption ?? "",
    addedAt: input.addedAt ?? new Date().toISOString(),
  };
}

export function photoIdFromFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadMetadataStore(): Promise<MetadataStore> {
  try {
    const raw = await readFile(METADATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as { photos?: Array<Partial<PhotoMetadata> & { filename: string }> };
    return {
      photos: Array.isArray(parsed.photos)
        ? parsed.photos
            .filter((photo): photo is Partial<PhotoMetadata> & { filename: string } =>
              typeof photo?.filename === "string" && photo.filename.length > 0,
            )
            .map(normalizeMetadata)
        : [],
    };
  } catch {
    return { photos: [] };
  }
}

async function saveMetadataStore(store: MetadataStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    METADATA_PATH,
    JSON.stringify(
      { photos: sortPhotos(store.photos).map(normalizeMetadata) },
      null,
      2,
    ),
  );
}

export async function loadPhotos(): Promise<{ photos: Photo[] }> {
  const store = await loadMetadataStore();
  const byFilename = new Map(store.photos.map((photo) => [photo.filename, photo]));

  let entries: string[] = [];
  try {
    entries = await readdir(PHOTOS_DIR);
  } catch {
    return { photos: [] };
  }

  const filenames = entries
    .filter((filename) => !filename.startsWith("."))
    .filter((filename) => EXTS.has(extname(filename).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  let dirty = store.photos.length !== filenames.length;
  const nextStorePhotos: PhotoMetadata[] = [];
  const photos: Photo[] = [];

  for (const filename of filenames) {
    const existing = byFilename.get(filename);
    const fullPath = join(PHOTOS_DIR, filename);

    let width = existing?.width ?? 0;
    let height = existing?.height ?? 0;
    if (!width || !height) {
      const meta = await sharp(fullPath).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
      dirty = true;
    }

    const addedAt =
      existing?.addedAt ??
      (await stat(fullPath)).birthtime?.toISOString() ??
      new Date().toISOString();

    if (!existing) dirty = true;

    const metadata: PhotoMetadata = {
      filename,
      width,
      height,
      title: existing?.title ?? "",
      caption: existing?.caption ?? "",
      addedAt,
    };

    nextStorePhotos.push(metadata);
    photos.push({
      id: photoIdFromFilename(filename),
      ...metadata,
    });
  }

  if (dirty) {
    await saveMetadataStore({ photos: nextStorePhotos });
  }

  return { photos: sortPhotos(photos) };
}

export async function upsertPhotoMetadata(
  filename: string,
  patch: Partial<Omit<PhotoMetadata, "filename">>,
): Promise<Photo> {
  const store = await loadMetadataStore();
  const idx = store.photos.findIndex((photo) => photo.filename === filename);

  if (idx < 0) {
    throw new Error(`Photo metadata not found for ${filename}`);
  }

  store.photos[idx] = {
    ...store.photos[idx],
    ...patch,
    filename,
  };
  await saveMetadataStore(store);
  return { id: photoIdFromFilename(filename), ...store.photos[idx] };
}

export async function removePhotoMetadata(filename: string): Promise<void> {
  const store = await loadMetadataStore();
  const next = store.photos.filter((photo) => photo.filename !== filename);
  if (next.length === store.photos.length) return;
  await saveMetadataStore({ photos: next });
}

export function photoSrc(p: Pick<Photo, "filename">): string {
  return `/photos/${p.filename}`;
}
