import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";
import { normalizeCameraMetadata, parseCameraMetadata } from "@/lib/exif";
import { MAX_IMAGE_PIXELS, stableId } from "@/lib/security";

export type Photo = {
  id: string;
  filename: string;
  volumeSlug: string;
  width: number;
  height: number;
  title: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  camera: string;
  lens: string;
  focalLength: string;
  addedAt: string;
};

type PhotoMetadata = Omit<Photo, "id" | "volumeSlug">;
type MetadataStore = { photos: PhotoMetadata[] };

const DATA_DIR = join(process.cwd(), "data");
const PHOTOS_ROOT = join(process.cwd(), "public", "photos");
const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic"]);

function photosDir(volumeSlug: string): string {
  return join(PHOTOS_ROOT, volumeSlug);
}

function metadataPath(volumeSlug: string): string {
  return join(DATA_DIR, volumeSlug, "photos.json");
}

function sortPhotos<T extends { addedAt: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (b.addedAt > a.addedAt ? 1 : -1));
}

function normalizeMetadata(
  input: Partial<PhotoMetadata> & { filename: string },
): PhotoMetadata {
  const camera = normalizeCameraMetadata(input);
  return {
    filename: input.filename,
    width: input.width ?? 0,
    height: input.height ?? 0,
    title: input.title ?? "",
    aperture: camera.aperture,
    shutterSpeed: camera.shutterSpeed,
    iso: camera.iso,
    camera: camera.camera,
    lens: camera.lens,
    focalLength: camera.focalLength,
    addedAt: input.addedAt ?? new Date().toISOString(),
  };
}

export function photoIdFromFilename(volumeSlug: string, filename: string): string {
  return stableId(`${volumeSlug}/${filename}`);
}

async function loadMetadataStore(volumeSlug: string): Promise<MetadataStore> {
  try {
    const raw = await readFile(metadataPath(volumeSlug), "utf8");
    const parsed = JSON.parse(raw) as {
      photos?: Array<Partial<PhotoMetadata> & { filename: string }>;
    };
    return {
      photos: Array.isArray(parsed.photos)
        ? parsed.photos
            .filter(
              (photo): photo is Partial<PhotoMetadata> & { filename: string } =>
                typeof photo?.filename === "string" && photo.filename.length > 0,
            )
            .map(normalizeMetadata)
        : [],
    };
  } catch {
    return { photos: [] };
  }
}

async function saveMetadataStore(
  volumeSlug: string,
  store: MetadataStore,
): Promise<void> {
  const dir = join(DATA_DIR, volumeSlug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    metadataPath(volumeSlug),
    JSON.stringify({ photos: sortPhotos(store.photos).map(normalizeMetadata) }, null, 2),
  );
}

export async function loadPhotos(volumeSlug: string): Promise<{ photos: Photo[] }> {
  const store = await loadMetadataStore(volumeSlug);
  const byFilename = new Map(store.photos.map((photo) => [photo.filename, photo]));

  let entries: string[] = [];
  try {
    entries = await readdir(photosDir(volumeSlug));
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
    const fullPath = join(photosDir(volumeSlug), filename);

    try {
      let width = existing?.width ?? 0;
      let height = existing?.height ?? 0;
      let aperture = existing?.aperture ?? "";
      let shutterSpeed = existing?.shutterSpeed ?? "";
      let iso = existing?.iso ?? "";
      let camera = existing?.camera ?? "";
      let lens = existing?.lens ?? "";
      let focalLength = existing?.focalLength ?? "";
      if (
        !width ||
        !height ||
        !aperture ||
        !shutterSpeed ||
        !iso ||
        !camera ||
        !lens ||
        !focalLength
      ) {
        const meta = await sharp(fullPath, {
          limitInputPixels: MAX_IMAGE_PIXELS,
        }).metadata();
        if (!width || !height) {
          width = meta.width ?? 0;
          height = meta.height ?? 0;
          dirty = true;
        }
        if (
          (!aperture ||
            !shutterSpeed ||
            !iso ||
            !camera ||
            !lens ||
            !focalLength) &&
          meta.exif
        ) {
          const parsedCamera = parseCameraMetadata(meta.exif);
          const previousCamera = [
            aperture,
            shutterSpeed,
            iso,
            camera,
            lens,
            focalLength,
          ].join("|");
          aperture = aperture || parsedCamera.aperture;
          shutterSpeed = shutterSpeed || parsedCamera.shutterSpeed;
          iso = iso || parsedCamera.iso;
          camera = camera || parsedCamera.camera;
          lens = lens || parsedCamera.lens;
          focalLength = focalLength || parsedCamera.focalLength;
          if (
            [aperture, shutterSpeed, iso, camera, lens, focalLength].join("|") !==
            previousCamera
          ) {
            dirty = true;
          }
        }
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
        aperture,
        shutterSpeed,
        iso,
        camera,
        lens,
        focalLength,
        addedAt,
      };

      nextStorePhotos.push(metadata);
      photos.push({
        id: photoIdFromFilename(volumeSlug, filename),
        volumeSlug,
        ...metadata,
      });
    } catch {
      dirty = true;
    }
  }

  if (dirty) {
    await saveMetadataStore(volumeSlug, { photos: nextStorePhotos });
  }

  return { photos: sortPhotos(photos) };
}

export async function upsertPhotoMetadata(
  volumeSlug: string,
  filename: string,
  patch: Partial<Omit<PhotoMetadata, "filename">>,
): Promise<Photo> {
  const store = await loadMetadataStore(volumeSlug);
  const idx = store.photos.findIndex((photo) => photo.filename === filename);
  if (idx < 0) {
    throw new Error(`Photo metadata not found for ${filename}`);
  }
  store.photos[idx] = { ...store.photos[idx], ...patch, filename };
  await saveMetadataStore(volumeSlug, store);
  return { id: photoIdFromFilename(volumeSlug, filename), volumeSlug, ...store.photos[idx] };
}

export async function removePhotoMetadata(
  volumeSlug: string,
  filename: string,
): Promise<void> {
  const store = await loadMetadataStore(volumeSlug);
  const next = store.photos.filter((photo) => photo.filename !== filename);
  if (next.length === store.photos.length) return;
  await saveMetadataStore(volumeSlug, { photos: next });
}
