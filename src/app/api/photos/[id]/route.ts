import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { isAuthed } from "@/lib/auth";
import { loadManifest, saveManifest } from "@/lib/photos";

const PHOTOS_DIR = join(process.cwd(), "public", "photos");

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const manifest = await loadManifest();
  const photo = manifest.photos.find((p) => p.id === id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  manifest.photos = manifest.photos.filter((p) => p.id !== id);
  await saveManifest(manifest);
  try {
    await unlink(join(PHOTOS_DIR, photo.filename));
  } catch {
    // file may already be gone; manifest is the source of truth
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: Ctx) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const manifest = await loadManifest();
  const idx = manifest.photos.findIndex((p) => p.id === id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (typeof body.title === "string") manifest.photos[idx].title = body.title;
  if (typeof body.caption === "string")
    manifest.photos[idx].caption = body.caption;
  await saveManifest(manifest);
  return NextResponse.json({ photo: manifest.photos[idx] });
}
