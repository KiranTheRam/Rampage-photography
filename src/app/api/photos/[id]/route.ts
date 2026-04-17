import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { isAuthed } from "@/lib/auth";
import { loadPhotos, removePhotoMetadata, upsertPhotoMetadata } from "@/lib/photos";

const PHOTOS_DIR = join(process.cwd(), "public", "photos");

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const { photos } = await loadPhotos();
  const photo = photos.find((p) => p.id === id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await unlink(join(PHOTOS_DIR, photo.filename));
  } catch {
    // The directory is the source of truth; treat a missing file as already deleted.
  }
  await removePhotoMetadata(photo.filename);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { photos } = await loadPhotos();
  const photo = photos.find((entry) => entry.id === id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await upsertPhotoMetadata(photo.filename, {
    title: typeof body.title === "string" ? body.title : photo.title,
    caption: typeof body.caption === "string" ? body.caption : photo.caption,
  });
  return NextResponse.json({ photo: updated });
}
