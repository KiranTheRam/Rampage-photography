import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { isAuthed } from "@/lib/auth";
import { loadManifest, saveManifest, type Photo } from "@/lib/photos";

const PHOTOS_DIR = join(process.cwd(), "public", "photos");
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function safeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  const title = (form.get("title") as string | null) ?? "";
  const caption = (form.get("caption") as string | null) ?? "";

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  await mkdir(PHOTOS_DIR, { recursive: true });
  const manifest = await loadManifest();
  const added: Photo[] = [];

  for (const file of files) {
    const ext = extname(file.name).toLowerCase();
    if (!ALLOWED.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    let width = 0;
    let height = 0;
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } catch {
      return NextResponse.json(
        { error: `Could not read image: ${file.name}` },
        { status: 400 },
      );
    }

    const base = safeSlug(file.name) || "photo";
    const unique = randomBytes(3).toString("hex");
    const filename = `${base}-${unique}${ext}`;
    await writeFile(join(PHOTOS_DIR, filename), buf);

    const photo: Photo = {
      id: `${base}-${unique}`,
      filename,
      width,
      height,
      title: files.length === 1 ? title : "",
      caption: files.length === 1 ? caption : "",
      addedAt: new Date().toISOString(),
    };
    manifest.photos.unshift(photo);
    added.push(photo);
  }

  await saveManifest(manifest);
  return NextResponse.json({ photos: added });
}

export async function GET() {
  const manifest = await loadManifest();
  return NextResponse.json(manifest);
}
