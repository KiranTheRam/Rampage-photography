import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { isAuthed } from "@/lib/auth";
import { loadPhotos, removePhotoMetadata, upsertPhotoMetadata } from "@/lib/photos";
import {
  MAX_CAPTION_LENGTH,
  MAX_TITLE_LENGTH,
  enforceSameOrigin,
  jsonNoStore,
  sanitizeText,
} from "@/lib/security";

const PHOTOS_ROOT = join(process.cwd(), "public", "photos");

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

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
    caption:
      typeof body.caption === "string"
        ? sanitizeText(body.caption, MAX_CAPTION_LENGTH)
        : photo.caption,
  });
  return jsonNoStore({ photo: updated });
}
