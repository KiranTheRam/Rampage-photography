import { readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

const PHOTOS_ROOT = resolve(join(process.cwd(), "public", "photos"));

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ volume: string; filename: string }> },
) {
  const { volume, filename } = await params;

  const filePath = resolve(join(PHOTOS_ROOT, volume, filename));
  if (!filePath.startsWith(PHOTOS_ROOT + "/")) {
    return new Response(null, { status: 400 });
  }

  const mime = MIME[extname(filename).toLowerCase()];
  if (!mime) {
    return new Response(null, { status: 404 });
  }

  try {
    const buf = await readFile(filePath);
    return new Response(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
