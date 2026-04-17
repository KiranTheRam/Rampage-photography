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

const PHOTOS_DIR = join(process.cwd(), "public", "photos");

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: Ctx) {
  const sameOriginError = enforceSameOrigin(_req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { photos } = await loadPhotos();
  const photo = photos.find((p) => p.id === id);
  if (!photo) {
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }
  try {
    await unlink(join(PHOTOS_DIR, photo.filename));
  } catch {
    // The directory is the source of truth; treat a missing file as already deleted.
  }
  await removePhotoMetadata(photo.filename);
  return jsonNoStore({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const sameOriginError = enforceSameOrigin(req);
  if (sameOriginError) return sameOriginError;
  if (!(await isAuthed())) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { photos } = await loadPhotos();
  const photo = photos.find((entry) => entry.id === id);
  if (!photo) {
    return jsonNoStore({ error: "Not found" }, { status: 404 });
  }
  const updated = await upsertPhotoMetadata(photo.filename, {
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
