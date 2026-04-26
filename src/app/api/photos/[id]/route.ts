import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { isAuthed } from "@/lib/auth";
import { loadPhotos, removePhotoMetadata, upsertPhotoMetadata } from "@/lib/photos";
import {
  MAX_TITLE_LENGTH,
  enforceSameOrigin,
  jsonNoStore,
  sanitizeText,
} from "@/lib/security";

const PHOTOS_ROOT = join(process.cwd(), "public", "photos");

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

const MAX_CAMERA_FIELD_LENGTH = 24;

export async function DELETE(_req: Request, ctx: Ctx) {
  const sameOriginError = enforceSameOrigin(_req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { searchParams } = new URL(_req.url);
  const volumeSlug = searchParams.get("volume");
  if (!volumeSlug) {
    return jsonNoStore({ error: "volume query param is required." }, { status: 400 });
  }

  const { photos } = await loadPhotos(volumeSlug);
  const photo = photos.find((p) => p.id === id);
  if (!photo) {
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }

  try {
    await unlink(join(PHOTOS_ROOT, volumeSlug, photo.filename));
  } catch {
    // treat missing file as already deleted
  }
  await removePhotoMetadata(volumeSlug, photo.filename);
  return jsonNoStore({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const volumeSlug = searchParams.get("volume");
  if (!volumeSlug) {
    return jsonNoStore({ error: "volume query param is required." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { photos } = await loadPhotos(volumeSlug);
  const photo = photos.find((p) => p.id === id);
  if (!photo) {
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }

  const updated = await upsertPhotoMetadata(volumeSlug, photo.filename, {
    title:
      typeof body.title === "string"
        ? sanitizeText(body.title, MAX_TITLE_LENGTH)
        : photo.title,
    aperture:
      typeof body.aperture === "string"
        ? sanitizeText(body.aperture, MAX_CAMERA_FIELD_LENGTH)
        : photo.aperture,
    shutterSpeed:
      typeof body.shutterSpeed === "string"
        ? sanitizeText(body.shutterSpeed, MAX_CAMERA_FIELD_LENGTH)
        : photo.shutterSpeed,
    iso:
      typeof body.iso === "string"
        ? sanitizeText(body.iso, MAX_CAMERA_FIELD_LENGTH)
        : photo.iso,
    camera:
      typeof body.camera === "string"
        ? sanitizeText(body.camera, MAX_CAMERA_FIELD_LENGTH * 3)
        : photo.camera,
    lens:
      typeof body.lens === "string"
        ? sanitizeText(body.lens, MAX_CAMERA_FIELD_LENGTH * 3)
        : photo.lens,
    focalLength:
      typeof body.focalLength === "string"
        ? sanitizeText(body.focalLength, MAX_CAMERA_FIELD_LENGTH)
        : photo.focalLength,
  });
  return jsonNoStore({ photo: updated });
}
