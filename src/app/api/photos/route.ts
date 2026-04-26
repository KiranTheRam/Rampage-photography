import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { isAuthed } from "@/lib/auth";
import { parseCameraMetadata } from "@/lib/exif";
import { loadPhotos, photoIdFromFilename, type Photo } from "@/lib/photos";
import {
  MAX_IMAGE_PIXELS,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_TOTAL_BYTES,
  enforceSameOrigin,
  jsonNoStore,
  sanitizeText,
} from "@/lib/security";

const PHOTOS_ROOT = join(process.cwd(), "public", "photos");
const ALLOWED = new Set(["jpeg", "png", "webp", "avif"]);
const FORMAT_EXT: Record<string, string> = {
  jpeg: ".jpg",
  png: ".png",
  webp: ".webp",
  avif: ".avif",
};

export const dynamic = "force-dynamic";

function safeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const volumeSlug = searchParams.get("volume");
  if (!volumeSlug) {
    return jsonNoStore({ error: "volume query param is required." }, { status: 400 });
  }
  return jsonNoStore(await loadPhotos(volumeSlug));
}

export async function POST(req: Request) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const volumeSlug = searchParams.get("volume");
  if (!volumeSlug) {
    return jsonNoStore({ error: "volume query param is required." }, { status: 400 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  const title = sanitizeText(
    (form.get("title") as string | null) ?? "",
    MAX_TITLE_LENGTH,
  );

  if (files.length === 0) {
    return jsonNoStore({ error: "No files provided." }, { status: 400 });
  }
  if (files.length > MAX_UPLOAD_FILES) {
    return jsonNoStore(
      { error: `You can upload up to ${MAX_UPLOAD_FILES} files at a time.` },
      { status: 400 },
    );
  }

  const volumeDir = join(PHOTOS_ROOT, volumeSlug);
  await mkdir(volumeDir, { recursive: true });

  const added: Photo[] = [];
  let totalBytes = 0;

  for (const file of files) {
    totalBytes += file.size;
    if (file.size <= 0 || file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      return jsonNoStore(
        {
          error: `Each file must be between 1 byte and ${Math.floor(
            MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024),
          )}MB.`,
        },
        { status: 400 },
      );
    }
    if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
      return jsonNoStore(
        {
          error: `Uploads cannot exceed ${Math.floor(
            MAX_UPLOAD_TOTAL_BYTES / (1024 * 1024),
          )}MB total.`,
        },
        { status: 400 },
      );
    }

    const requestedExt = extname(file.name).toLowerCase();
    const buf = Buffer.from(await file.arrayBuffer());
    let width = 0;
    let height = 0;
    let actualExt = "";
    let aperture = "";
    let shutterSpeed = "";
    let iso = "";
    let camera = "";
    let lens = "";
    let focalLength = "";
    try {
      const meta = await sharp(buf, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
      const format = meta.format ?? "";
      if (!ALLOWED.has(format)) {
        return jsonNoStore(
          { error: `Unsupported file type: ${requestedExt || "unknown"}` },
          { status: 400 },
        );
      }
      width = meta.width ?? 0;
      height = meta.height ?? 0;
      if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
        return jsonNoStore(
          { error: `Image is too large: ${file.name}` },
          { status: 400 },
        );
      }
      actualExt = FORMAT_EXT[format];
      const parsedCamera = parseCameraMetadata(meta.exif);
      aperture = parsedCamera.aperture;
      shutterSpeed = parsedCamera.shutterSpeed;
      iso = parsedCamera.iso;
      camera = parsedCamera.camera;
      lens = parsedCamera.lens;
      focalLength = parsedCamera.focalLength;
    } catch {
      return jsonNoStore(
        { error: `Could not read image: ${file.name}` },
        { status: 400 },
      );
    }

    const base = safeSlug(file.name) || "photo";
    const unique = randomBytes(8).toString("hex");
    const filename = `${base}-${unique}${actualExt}`;
    await writeFile(join(volumeDir, filename), buf);

    const photo: Photo = {
      id: photoIdFromFilename(volumeSlug, filename),
      volumeSlug,
      filename,
      width,
      height,
      title: files.length === 1 ? title : "",
      aperture,
      shutterSpeed,
      iso,
      camera,
      lens,
      focalLength,
      addedAt: new Date().toISOString(),
    };
    added.push(photo);
  }

  return jsonNoStore({ photos: added });
}
